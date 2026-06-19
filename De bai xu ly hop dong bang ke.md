Hãy mô tả lại bài toán để AI Studio có thể hiểu và build webapp/app chính xác những gì tôi cần nhưng không hạn chế sáng tạo. Đồng thời hãy tư vấn cho tôi các vấn đề hoặc các ý tưởng để người dùng thao tác dễ dàng hơn, thoải mái hơn, hiệu quả hơn, ít rủi ro hơn.
Tôi cũng muốn tư vẫn phương án cách thực hiện nào tối ưu, hiệu quả với yêu cầu này.

Dưới đây là mô tả mong muốn:

- Upload 3 file danh mục lên app, lưu trữ trên app, sau này sẽ dùng google sheet để làm database (cần 3 database)
- 3 phần kiểm tra riêng biệt nhưng output: Hợp đồng luân chuyển, Hợp đồng mới, Bảng kê
- Các danh sách master dùng chung gồm có: 
+ Danh sách mã bộ phận gồm 3 cột: 
 * Stt	
 * Tên bộ phận thực hiện	
 * Mã sale
+ Danh sách mã khách gồm 3 cột: 
 * Stt	
 * Tên khách	
 * Mã khách
+ Danh sách Chuẩn hóa sản phẩm vụ việc gồm các cột: 
 * Cụm từ nhận diện trong Nội dung diễn giải / hoặc đơn vị tính (Keywword)	
 * Chuẩn hóa mã Vụ việc	
 * Chuẩn hóa Tên sản phẩm	
 * Tk doanh thu

Phần 1: Xử lý hợp đồng luân chuyển:
	Trong phần này tôi cần tư vấn xem nên xử lý file hợp đồng cứng trước hay lọc dữ liệu trước. Quy trình hiện tại như sau:
 Bước 1: Upload file Hợp đồng cứng và Xử lý file này:
 Các cột trong file hợp đồng cứng này lần lượt như sau:
 Mã hợp đồng	Tên hợp đồng	Tên Khách hàng	Mã khách	Tên NVKD	Bộ phận thực hiện	Ngày bắt đầu	Ngày kết thúc	Ngày hợp đồng	ngay_hd1	ngay_hd2	ngay_hd3	ngay_hd4	ngay_hd5	ngay_hd6	tien_hd1	tien_hd2	tien_hd3	tien_hd4	tien_hd5	tien_hd6	Giá trị	ma_vv	Số lượng	Đơn giá	Thuế suất	Giá trị của vv	tk_doanh thu	Bảng kê	Tỷ lệ ck	Chuyên trang	Ghi chú	Hình thức QC	Sản phẩm	Website	Loại banner	Chuyên trang import	Sản phầm Import
 Cách xử lý thông tin mỗi cột như sau:
 - Nhập thông tin vào cột Mã khách (Cột D): cách lấy là tham chiếu từ cột C trong file này (cột Tên Khách hàng) tham chiếu đến Danh sách mã khách tìm trong cột Tên khách (Cột B) tham chiếu đến cột C (Mã khách)
 - Nhập thông tin Bộ phận thực hiện (Cột F): cách lấy là tham chiếu từ cột E trong file này (cột Tên NVKD) tham chiếu đến Danh sách mã bộ phận tìm trong cột Tên bộ phận thực hiện (Cột B) tham chiếu đến cột C (Mã sale)
 - Nhập thông tin Mã vụ việc (Cột W): phần này khó nhất, phức tạp nhất. Cách lấy: Cột Chuyên trang (Cột AE) tham chiếu đến Danh sách Chuẩn hóa sản phẩm vụ việc tìm trong cột Cụm từ nhận diện trong Nội dung diễn giải / hoặc đơn vị tính (Cột A) tham chiếu đến cột B (Chuẩn hóa mã Vụ việc). Lưu ý, cột chuyên trang có thể là 1 keyword nên cần tính đến phương án keyword trùng nhau hoặc keyword này chứa keyword khác, đề xuất phương án tối ưu nhất để đảm bảo mức độ chính xác là cao nhất
 - Nhập Tài khoản doanh thu (Cột AB): Cách lấy: từ mã vụ việc tìm được ở cột W, tham chiếu đến Danh sách chuẩn hóa sản phẩm vụ việc, tìm trong cột Chuẩn hóa mã Vụ việc (Cột B) và tham chiếu đến cột TK doanh thu (Cột D)
 - Nhập Chuyên trang Import  (Cột AK): Bản chất cột này là nối =AG&" - "&AE nên có thể cân nhắc bỏ việc nối này trên giao diện người dùng, khi xuất file ra thì nối sẵn để tạo thành cột nối. Ngoại lệ: nếu cột AE có xuất hiện dữ liệu :  
	- ADX - Viết nội dung: Mua gói quảng cáo ADX
	- Native ads - Viết nội dung: Mua gói quảng cáo Native ads
	- Kingsize, Mobile - viết nội dung
	Không phân biệt ký tự viết hoa viết thưởng, có thể có danh sách ngoại lệ dài hơn và được nên cần phương án tạo 1 khu vực setup
 - Nhập Sản phẩm Import (Cột AL): giống cách làm của cột Mã vụ việc (Cột W), tham chiếu đến Danh sách Chuẩn hóa sản phẩm vụ việc tìm trong cột Cụm từ nhận diện trong Nội dung diễn giải / hoặc đơn vị tính (Cột A) tham chiếu đến cột C (Chuẩn hóa Tên sản phẩm). Lưu ý, cột chuyên trang có thể là 1 keyword nên cần tính đến phương án keyword trùng nhau hoặc keyword này chứa keyword khác, đề xuất phương án tối ưu nhất để đảm bảo mức độ chính xác là cao nhất
 - Các cột còn lại giữ  nguyên giá trị gốc
 
 Bước 2: Upload file Danh sách hợp đồng Fast gồm các cột sau:
 Hợp đồng	Tên hợp đồng	Ngày hợp đồng	Mã khách	Bộ phận kinh doanh	Bộ phận thực hiện	Ngày bắt đầu	Ngày kết thúc	Trạng thái	Người tạo	Ngày tạo	Người sửa	Ngày sửa	Ghi chú
 
 Bước 3: So sánh 2 file để trích xuất dữ liệu:
 - Cột dùng để so sánh là cột B (Tên hợp đồng) của mỗi file.
 - Các trường hợp cần lấy thông tin sang file output:
 + Trường hợp 1: Hợp đồng có trong file Hợp đồng cứng (File 1) mà không có trong file Danh sách hợp đồng Fast (File 2)
 + Trường hợp 2: Hợp đồng tồn tại cả trong file 1 và file 2 nhưng trong file 2, cột Trạng thái (Cột I) có giá trị là 2 và cột Ghi chú (Cột L) trống.
 - Thông tin cần lấy từ file 1 sang file Output (File 3) là:
 + A	Mã hợp đồng			Lấy từ cột cùng tên file Hợp đồng cứng
 + B	Tên hợp đồng		Lấy từ cột cùng tên file Hợp đồng cứng
 + C	Mã khách			Lấy từ cột cùng tên file Hợp đồng cứng
 + D	Bộ phân thưc hiện	Lấy từ cột cùng tên file Hợp đồng cứng
 + E	Ngày bắt đầu		Lấy từ cột cùng tên file Hợp đồng cứng
 + F	Ngày kết thúc		Lấy từ cột cùng tên file Hợp đồng cứng
 + G	Ngày hợp đồng		Lấy từ cột cùng tên file Hợp đồng cứng
 + H	ngay_hd1			Lấy từ cột cùng tên file Hợp đồng cứng
 + I	ngay_hd2			Lấy từ cột cùng tên file Hợp đồng cứng
 + J	ngay_hd3			Lấy từ cột cùng tên file Hợp đồng cứng
 + K	ngay_hd4			Lấy từ cột cùng tên file Hợp đồng cứng
 + L	ngay_hd5			Lấy từ cột cùng tên file Hợp đồng cứng
 + M	ngay_hd6			Lấy từ cột cùng tên file Hợp đồng cứng
 + N	tien_hd1			Lấy từ cột cùng tên file Hợp đồng cứng
 + O	tien_hd2			Lấy từ cột cùng tên file Hợp đồng cứng
 + P	tien_hd3			Lấy từ cột cùng tên file Hợp đồng cứng
 + Q	tien_hd4			Lấy từ cột cùng tên file Hợp đồng cứng
 + R	tien_hd5			Lấy từ cột cùng tên file Hợp đồng cứng
 + S	tien_hd6			Lấy từ cột cùng tên file Hợp đồng cứng
 + T	Giá trị				Lấy từ cột cùng tên file Hợp đồng cứng
 + U	ma_vv				Lấy từ cột cùng tên file Hợp đồng cứng
 + V	Số lượng			Lấy từ cột cùng tên file Hợp đồng cứng
 + W	Đơn giá				Lấy từ cột cùng tên file Hợp đồng cứng
 + X	Thuế suất			Lấy từ cột cùng tên file Hợp đồng cứng
 + Y	Giá trị của vv VAT	Lấy từ cột cùng tên file Hợp đồng cứng
 + Z	tk_doanh thu		Lấy từ cột cùng tên file Hợp đồng cứng
 + AA	Bảng kê				Lấy từ cột cùng tên file Hợp đồng cứng
 + AB	Tỷ lệ ck			Lấy từ cột cùng tên file Hợp đồng cứng
 + AC	Chuyên trang		Lấy từ cột Chuyên trang import file Hợp đồng cứng
 + AD	Ghi chú chi tiết	Lấy từ cột cùng tên file Hợp đồng cứng
 + AE						Để trống
 + AF	Status				Để mặc định giá trị là 1
 + AG						Để trống
 + AH	Ghi chú tổng		Để trống
 + AI	stt					Để trống
 + AJ	Tên sản phẩm		Lấy từ cột có tên Sản phầm Import  file Hợp đồng cứng


Phần 2: Xử lý hợp đồng mới:
Trong phần này tôi cần tư vấn xem nên xử lý file hợp đồng mới trước hay lọc dữ liệu trước. Quy trình hiện tại như sau:
 Bước 1: Upload file Hợp đồng mới và Xử lý file này:
 Các cột trong file hợp đồng mới này lần lượt như sau:
 Số HĐ	Dự án	Tên sale	Phòng ban	Tên khách hàng	Loại khách hàng	Số hợp đồng TH Áp dụng	Nhãn hàng	Giá trị HĐ	Thành tiền thực chạy (có VAT)	Tỷ lệ hoàn thành	D.Thu Khác	Tổng giá trị HĐ	Điều kiện thanh toán	Giá trị đặt cọc	Tình trạng đặt cọc	Bản cứng	Bản fax	Công nợ	Công nợ tạm tính	Giá trị trao đổi	Phân bổ ID	Nhãn hàng	Nhóm ngành	Hình thức QC	Sản phẩm	Nhóm website	Tag	Website	Chuyên mục	Loại banner	Tên banner	Số lượng	Đơn giá	Chiết khấu	Giảm giá	Thành tiền
 Cách xử lý thông tin mỗi cột như sau:
 - Thêm cột Mã hợp đồng (Cột AL) = cột Số HĐ (Cột A) nối thêm hậu tố (AD). Cần phương án để 1 ô input cho người dùng nhập và gán giá trị mặc định của ô này là AD
 - Thêm cột Tên hợp đồng (Cột AM) = cột Số HĐ (Cột A) nối thêm hậu tố (/AD). Cần phương án để 1 ô input cho người dùng nhập và gán giá trị mặc định của ô này là /AD. Hoặc kết hợp với cột trên và chỉ thêm dấu ngăn cách là dấu /
 - Thêm cột Mã khách (Cột AN) và xử lý như sau: cách lấy là tham chiếu từ cột E trong file này (cột Tên Khách hàng) tham chiếu đến Danh sách mã khách tìm trong cột Tên khách (Cột B) tham chiếu đến cột C (Mã khách)
 - Thêm cột Bộ phận thực hiện (Cột AO): cách lấy là tham chiếu từ cột C trong file này (cột Tên sale) tham chiếu đến Danh sách mã bộ phận tìm trong cột Tên bộ phận thực hiện (Cột B) tham chiếu đến cột C (Mã sale)
 - Thêm cột Mã Vụ việc (Cột AP): phần này khó nhất, phức tạp nhất. Cách lấy: Sản phẩm (Cột Z), cột Loại banner (cột AC), cột Tên banner (cột AF) tham chiếu đến Danh sách Chuẩn hóa sản phẩm vụ việc tìm trong cột Cụm từ nhận diện trong Nội dung diễn giải / hoặc đơn vị tính (Cột A) tham chiếu đến cột B (Chuẩn hóa mã Vụ việc). Lưu ý, cột Z, AE, AF có thể là nhiều keyword nên cần tính đến phương án keyword trùng nhau hoặc keyword này chứa keyword khác, đề xuất phương án tối ưu nhất để đảm bảo mức độ chính xác là cao nhất	
 - Thêm cột Số lượng (Cột AQ): lấy từ cột AG trong file này nhưng chỉ lấy phần số, không lấy phần text
 - Thêm cột Đơn giá (AR): lấy bằng giá trị cột AH
 - Thêm cột Thuế suất (AS): Cách lấy: từ mã vụ việc tìm được ở cột AP, tham chiếu đến Danh sách chuẩn hóa sản phẩm vụ việc, tìm trong cột Chuẩn hóa mã Vụ việc (Cột B) và tham chiếu đến cột thuế suất(Cột E) 	
 - Thêm cột Giá trị của vv VAT (AT): = Thành tiền (cột AK) * Thuế suất (Cột AS)
 - Thêm cột tk_doanh thu (AU): Dựa vào mã vụ việc đã tìm được ở cột AP, tham chiếu đến Danh sách Chuẩn hóa sản phẩm vụ việc cột A (Cụm từ nhận diện trong Nội dung diễn giải / hoặc đơn vị tính) tìm cột Tk doanh thu (Cột D)
 - Thêm cột Tỷ lệ ck (AV): lấy giá trị tại cột AI
 
 Bước 2: Upload file Danh sách hợp đồng Fast gồm các cột sau:
 Hợp đồng	Tên hợp đồng	Ngày hợp đồng	Mã khách	Bộ phận kinh doanh	Bộ phận thực hiện	Ngày bắt đầu	Ngày kết thúc	Trạng thái	Người tạo	Ngày tạo	Người sửa	Ngày sửa	Ghi chú
 Bước này dùng file giống hệt với Bước 2 của phần 1. File này thường có hàng nghìn dòng.
 
 Bước 3: So sánh 2 file để trích xuất dữ liệu:
 - Cột dùng để so sánh là cột Tên hợp đồng của mỗi file. Chỉ lấy thông tin của các dòng mà Tên hợp đồng chỉ xuất hiện trong file Hợp đồng mới, không xuất hiện trong file Danh sách hợp đồng Fast để đưa vào file output
 - Các trường hợp cần lấy thông tin sang file output:
 - Thông tin cần lấy từ file 1 sang file Output (File 3) là:
 + A	Mã hợp đồng			Lấy từ cột cùng tên file Hợp đồng mới
 + B	Tên hợp đồng		Lấy từ cột cùng tên file Hợp đồng mới
 + C	Mã khách			Lấy từ cột cùng tên file Hợp đồng mới
 + D	Bộ phân thưc hiện	Lấy từ cột cùng tên file Hợp đồng mới
 + E	Ngày bắt đầu		Lấy từ cột cùng tên file Hợp đồng mới
 + F	Ngày kết thúc		Lấy từ cột cùng tên file Hợp đồng mới
 + G	Ngày hợp đồng		Lấy từ cột cùng tên file Hợp đồng mới
 + H	ngay_hd1			Lấy từ cột cùng tên file Hợp đồng mới
 + I	ngay_hd2			Lấy từ cột cùng tên file Hợp đồng mới
 + J	ngay_hd3			Lấy từ cột cùng tên file Hợp đồng mới
 + K	ngay_hd4			Lấy từ cột cùng tên file Hợp đồng mới
 + L	ngay_hd5			Lấy từ cột cùng tên file Hợp đồng mới
 + M	ngay_hd6			Lấy từ cột cùng tên file Hợp đồng mới
 + N	tien_hd1			Lấy từ cột cùng tên file Hợp đồng mới
 + O	tien_hd2			Lấy từ cột cùng tên file Hợp đồng mới
 + P	tien_hd3			Lấy từ cột cùng tên file Hợp đồng mới
 + Q	tien_hd4			Lấy từ cột cùng tên file Hợp đồng mới
 + R	tien_hd5			Lấy từ cột cùng tên file Hợp đồng mới
 + S	tien_hd6			Lấy từ cột cùng tên file Hợp đồng mới
 + T	Giá trị				Lấy từ cột cùng tên file Hợp đồng mới
 + U	ma_vv				Lấy từ cột cùng tên file Hợp đồng mới
 + V	Số lượng			Lấy từ cột cùng tên file Hợp đồng mới
 + W	Đơn giá				Lấy từ cột cùng tên file Hợp đồng mới
 + X	Thuế suất			Lấy từ cột cùng tên file Hợp đồng mới
 + Y	Giá trị của vv VAT	Lấy từ cột cùng tên file Hợp đồng mới
 + Z	tk_doanh thu		Lấy từ cột cùng tên file Hợp đồng mới
 + AA	Bảng kê				Lấy từ cột cùng tên file Hợp đồng mới
 + AB	Tỷ lệ ck			Lấy từ cột cùng tên file Hợp đồng mới
 + AC	Chuyên trang		Lấy từ cột Chuyên trang import file Hợp đồng mới
 + AD	Ghi chú chi tiết	Lấy từ cột cùng tên file Hợp đồng mới
 + AE						Để trống
 + AF	Status				Để mặc định giá trị là 2
 + AG						Để trống
 + AH	Ghi chú tổng		Để trống
 + AI	stt					Để trống
 + AJ	Tên sản phẩm		Lấy từ cột có tên Sản phầm Import  file Hợp đồng mới
 
Phần 3: Xử lý bảng kê:
Trong phần này tôi cần tư vấn xem nên xử lý file hợp đồng mới trước hay lọc dữ liệu trước. Quy trình hiện tại như sau:
 Bước 1: Upload file Bảng kê có các cột lần lượt như sau:
 STT	Mã booking	Số HT	Nhãn	Nội dung quảng cáo	Chi tiết	Lịch đăng	Đơn vị tính	Số lượng	Đơn giá	Chiết khấu	 Thành tiền sau chiết khấu (VNĐ) 	Ghi chú
 Bước 2: Upload file Danh sách hợp đồng Fast gồm các cột lần lượt như sau:
 Hợp đồng	Tên hợp đồng	Ngày hợp đồng	Mã khách	Bộ phận kinh doanh	Bộ phận thực hiện	Ngày bắt đầu	Ngày kết thúc	Trạng thái	Người tạo	Ngày tạo	Người sửa	Ngày sửa	Ghi chú
 
 Bước 3: Xử lý Bảng kê
 Cách xử lý thông tin mỗi cột như sau:
 STT	Tên cột bổ sung	Vị trí cột	Cách xử lý
1	Trạng thái	N	Xử lý sau khi có Tên hợp đồng (cột P). Lấy cột P tham chiếu tới file Danh sách hợp đồng Fast, cột B (Tên hợp đồng), lấy giá trị tại cột Trạng thái (Cột I)
2	Hợp đồng	O	Xử lý tước tiên, lấy cột Mã booking thêm hậu tố (mặc định là AD). Nên xử lý theo hướng cho phép người dùng input hậu tố này, để giá trị mặc định khi load trang là AD
3	Tên hợp đồng	P	Xử lý thứ nhì, lấy cột Mã booking thêm hậu tố (mặc định là /AD). Nên xử lý theo hướng cho phép người dùng input hậu tố và dấu ngăn cách này, để giá trị mặc định khi load trang là AD và dấu ngăn cách là /
4	Mã khách	Q	Xử lý sau khi có Tên hợp đồng (cột P). Lấy cột P tham chiếu tới file Danh sách hợp đồng Fast, cột B (Tên hợp đồng), lấy giá trị tại cột Mã khách (Cột D)
5	Bộ phận thực hiện	R	Xử lý sau khi có Tên hợp đồng (cột P). Lấy cột P tham chiếu tới file Danh sách hợp đồng Fast, cột B (Tên hợp đồng), lấy giá trị tại cột Bộ phận thực hiện (Cột F)
6	Ngày bắt đầu	S	Lấy ngày tại cột Lịch đăng (Cột D) nhưng xử lý theo logic sau: Nếu có dạng tiêu chuẩn dd/MM/yyyy hoặc M/d/yyyy (tức là dạng ngày chuẩn) thì lấy ngày đó. Nếu Có dạng dd/MM/yyyy-dd/MM/yyyy hoặc d-d/M/yyyy hoặc d/M-d/M/yyyy hoặc d/M/yy-d/M/yy … thì lấy phần trước và tự hoàn thiện cho đủ ngày tháng năm.
7	Ngày kết thúc	T	Lấy ngày tại cột Lịch đăng (Cột D) nhưng xử lý theo logic sau: Nếu có dạng tiêu chuẩn dd/MM/yyyy hoặc M/d/yyyy (tức là dạng ngày chuẩn) thì lấy ngày đó. Nếu Có dạng dd/MM/yyyy-dd/MM/yyyy hoặc d-d/M/yyyy hoặc d/M-d/M/yyyy hoặc d/M/yy-d/M/yy … thì lấy phần sau và tự hoàn thiện cho đủ ngày tháng năm.
8	Ngày hợp đồng	U	Tách từ số hợp đồng tại cột Mã booking (Cột B). Logic như sau: 4 ký tự cuối của Mã booking sẽ là Mmyy, ngày hợp đồng sẽ là dd/MM/yyyy trong đó dd là ngày đầu tiên của tháng.
9	Mã VV	V	phần này khó nhất, phức tạp nhất. Cách lấy:  lấy thông tin tại cột Nội dung quảng cáo (Cột E)  tham chiếu đến Danh sách Chuẩn hóa sản phẩm vụ việc tìm trong cột Cụm từ nhận diện trong Nội dung diễn giải / hoặc đơn vị tính (Cột A) tham chiếu đến cột B (Chuẩn hóa mã Vụ việc). Lưu ý, có thể là nhiều keyword nên cần tính đến phương án keyword trùng nhau hoặc keyword này chứa keyword khác, đề xuất phương án tối ưu nhất để đảm bảo mức độ chính xác là cao nhất.
10	Số lượng	W	Lấy giá trị tại cột I, dùng để đưa vào file output nên có thể tính toán bỏ không cần cột này
11	Đơn giá	X	Lấy giá trị tại cột J, dùng để đưa vào file output nên có thể tính toán bỏ không cần cột này
12	Thuế suất	Y	Lấy thuế chung của bảng kê, nó sẽ nằm ở dòng có gộp ô, bắt đầu bằng từ khóa VAT, tách phần số ra, bỏ ký tự %
13	Giá trị của vv VAT	Z	 = Thành tiền sau chiết khấu (VNĐ) (Cột L) * giá trị cột Thuế suất (cột Y)/100
14	tk_doanh thu	AA	Dựa vào mã vụ việc đã tìm được ở cột V, tham chiếu đến Danh sách Chuẩn hóa sản phẩm vụ việc cột A (Cụm từ nhận diện trong Nội dung diễn giải / hoặc đơn vị tính) tìm cột Tk doanh thu (Cột D)
15	Tỷ lệ ck	AB	 = Giá trị tại cột K bỏ ký hiệu %
16	Chuyên trang	AC	" = Nội dung cột E (Nội dung quảng cáo). Ngoại lệ trong 1 số trường hợp đặc biệt: nếu cột E có xuất hiện dữ liệu :  
- ADX - Viết nội dung: Mua gói quảng cáo ADX
- Native ads - Viết nội dung: Mua gói quảng cáo Native ads
Có thể danh sách sẽ được bổ sung thêm các trường hợp ngoại lệ (từ khóa và value đúng) nên cần phương án tạo 1 khu vực setup tạo danh sách cố định cho các ngoại lệ này"
17	Ghi chú chi tiết	AD	Xử lý thứ nhì, lấy cột Số HT (Cột C) thêm hậu tố (mặc định là /AD). Nên xử lý theo hướng cho phép người dùng input hậu tố và dấu ngăn cách này, để giá trị mặc định khi load trang là AD và dấu ngăn cách là /
18	Status	AE	Mặc định giá trị là 1
19	Tên sản phẩm	AF	phần này khó nhất, phức tạp nhất. Cách lấy:  lấy thông tin tại cột Nội dung quảng cáo (Cột E)  tham chiếu đến Danh sách Chuẩn hóa sản phẩm vụ việc tìm trong cột Cụm từ nhận diện trong Nội dung diễn giải / hoặc đơn vị tính (Cột A) tham chiếu đến cột C (Chuẩn hóa tên sản phẩm). Lưu ý, có thể là nhiều keyword nên cần tính đến phương án keyword trùng nhau hoặc keyword này chứa keyword khác, đề xuất phương án tối ưu nhất để đảm bảo mức độ chính xác là cao nhất.

Bước 4: Xử lý output:
- Từ thông tin đã xử lý trên sẽ xử lý để xuất ra excel 2 mẫu file import với cùng form là các cột như mô tả dưới đây:
1	Mã hợp đồng	Cột hợp đồng mới tạo thêm (cột O)
2	Tên hợp đồng	Cột Tên hợp đồng mới tạo thêm (Cột P)
3	Mã khách	Cột Mã khách mới tạo thêm (Cột Q)
4	Bộ phân thưc hiện	Cột Bộ phận thực hiện mới tạo thêm (Cột R)
5	Ngày bắt đầu	Cột Ngày bắt đầu mới tạo thêm (Cột S)
6	Ngày kết thúc	Cột Ngày kết thúc mới tạo thêm (Cột T)
7	Ngày hợp đồng	Cột Ngày hợp đồng mới tạo thêm (Cột U)
8	ngay_hd1	Bỏ trống (null)
9	ngay_hd2	Bỏ trống (null)
10	ngay_hd3	Bỏ trống (null)
11	ngay_hd4	Bỏ trống (null)
12	ngay_hd5	Bỏ trống (null)
13	ngay_hd6	Bỏ trống (null)
14	tien_hd1	Bỏ trống (null)
15	tien_hd2	Bỏ trống (null)
16	tien_hd3	Bỏ trống (null)
17	tien_hd4	Bỏ trống (null)
18	tien_hd5	Bỏ trống (null)
19	tien_hd6	Bỏ trống (null)
20	Giá trị	Bỏ trống (null)
21	ma_vv	Cột Mã vv mới tạo thêm (Cột V)
22	Số lượng	Cột Số lượng mới tạo thêm (Cột W)
23	Đơn giá	Cột Đơn giá mới tạo thêm (Cột X)
24	Thuế suất	Cột Thuế suất mới tạo thêm (Cột Y)
25	Giá trị của vv VAT	Cột Giá trị của vv VAT mới tạo thêm (Cột Z)
26	tk_doanh thu	Cột tk_doanh thu mới tạo thêm (Cột AA)
27	Bảng kê	Bỏ trống (null)
28	Tỷ lệ ck	Cột Tỷ lệ ck mới tạo thêm (Cột AB)
29	Chuyên trang	Cột Chuyên trang mới tạo thêm (Cột AC)
30	Ghi chú chi tiết	Cột Ghi chú chi tiết mới tạo thêm (Cột AD)
31		Bỏ trống (null)
32	Status	Cột Trạng thái mới tạo thêm (Cột AE)
33		Bỏ trống (null)
34	Ghi chú tổng	Bỏ trống (null)
35	stt	Bỏ trống (null)
36	Tên sản phẩm	Cột Tên sản phẩm mới tạo thêm (Cột AF)

Cách lấy dữ liệu để xuất ra 2 file excel như sau:
- Nút xuất file import_hop_dong_moi là danh sách các hợp đồng mới: Tham chiếu cột Tên hợp đồng mới tạo (cột P) với Danh sách hợp đồng Fast - cột Tên hợp đồng (Cột B), nếu không có thì là hợp đồng mới. Nếu có nhưng cột trạng thái (cột I) trong Danh sách hợp đồng Fast là 2 thì cũng là hợp đồng mới.
- Nút xuất file import_hop_dong_cu là danh sách các hợp đồng cũ: Tham chiếu cột Tên hợp đồng mới tạo (cột P) với Danh sách hợp đồng Fast - cột Tên hợp đồng (Cột B), Có Tên hợp đồng và cột trạng thái (cột I) trong Danh sách hợp đồng Fast là thì cũng là hợp đồng cũ.
 
 
 Ghi chú: 
 1 - Hãy tư vấn giúp tôi các nội dung trên. Đặc biệt là việc tham chiếu để lấy các giá trị theo cách của Mã VV (Mã vụ việc) vì sẽ khó chính xác được tuyệt đối. Vì vậy có thể tính đến phương án tỷ lệ chính xác và mức độ tự tin vào cách xử lý.
 2 - Cho phép người dùng có thể sửa được từng dòng trên UI trước khi xuất dữ liệu thành output.
 3 - Những loại output mà cần tính đến tỷ lệ chính xác và mức độ tự tin thì cho phép người dùng khi bấm nút sửa sẽ được chọn dropdown trong các giá trị có khả năng khớp. Đồng thời cho phép người dùng search/ nhập tay được giá trị vào những cột như vậy (Autocomplete)
 
